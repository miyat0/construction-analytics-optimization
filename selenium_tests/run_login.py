"""
Open FORTESITE in Chrome and sign in, the same way a person would.

Prerequisite:
  1. Backend is running:  http://127.0.0.1:8000
  2. Frontend is running: http://localhost:5173

Run from the project root:

  backend\\.venv\\Scripts\\python.exe selenium_tests\\run_login.py --email admin@example.com --password YOUR_PASSWORD
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASE_URL = "http://localhost:5173"


def build_driver(*, headless: bool) -> webdriver.Chrome:
    options = Options()
    options.add_argument("--window-size=1280,800")
    options.add_argument("--disable-gpu")
    if headless:
        options.add_argument("--headless=new")
    return webdriver.Chrome(options=options)


def wait_for_login_form(driver: webdriver.Chrome, timeout: int = 20) -> None:
    WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.ID, "email")))
    WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.ID, "password")))


def sign_in(driver: webdriver.Chrome, email: str, password: str) -> None:
    wait_for_login_form(driver)
    email_box = driver.find_element(By.ID, "email")
    password_box = driver.find_element(By.ID, "password")
    email_box.clear()
    email_box.send_keys(email)
    password_box.clear()
    password_box.send_keys(password)
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()


def read_login_error(driver: webdriver.Chrome) -> str:
    messages = driver.find_elements(By.CSS_SELECTOR, ".login-page__form-error, .login-page__alert, [role='alert']")
    texts = [item.text.strip() for item in messages if item.text.strip()]
    return " | ".join(texts)


def assert_left_login_page(driver: webdriver.Chrome, timeout: int = 20) -> str:
    wait = WebDriverWait(driver, timeout)
    try:
        wait.until(lambda d: "/login" not in d.current_url)
    except TimeoutException as exc:
        error_text = read_login_error(driver)
        raise AssertionError(
            "Still on the login page. Check email/password, and that Django + Vite are running. "
            f"Page message: {error_text or '(none)'}. URL: {driver.current_url}"
        ) from exc
    return driver.current_url


def run(email: str, password: str, base_url: str, headless: bool) -> None:
    login_url = f"{base_url.rstrip('/')}/login"
    driver = build_driver(headless=headless)
    try:
        print(f"Opening {login_url}")
        driver.get(login_url)
        sign_in(driver, email, password)
        landed = assert_left_login_page(driver)
        print(f"PASS: signed in as {email}")
        print(f"PASS: browser moved to {landed}")
        if "admin" in landed:
            driver.get(f"{base_url.rstrip('/')}/admin/projects")
            WebDriverWait(driver, 15).until(EC.url_contains("/admin/projects"))
            print("PASS: Admin Projects page opened")
    finally:
        driver.quit()
        print("Chrome closed.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Selenium login test for FORTESITE")
    parser.add_argument("--email", required=True, help="Website login email")
    parser.add_argument("--password", required=True, help="Website login password")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--headless", action="store_true", help="Run Chrome without a window")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        run(args.email, args.password, args.base_url, args.headless)
    except Exception as exc:
        print(f"FAIL: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
