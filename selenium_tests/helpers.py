from __future__ import annotations

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

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
    messages = driver.find_elements(
        By.CSS_SELECTOR,
        ".login-page__form-error, .login-page__alert, [role='alert']",
    )
    texts = [item.text.strip() for item in messages if item.text.strip()]
    return " | ".join(texts)


def assert_left_login_page(driver: webdriver.Chrome, timeout: int = 20) -> str:
    try:
        WebDriverWait(driver, timeout).until(lambda d: "/login" not in d.current_url)
    except TimeoutException as exc:
        error_text = read_login_error(driver)
        raise AssertionError(
            "Still on the login page. Check email/password, and that Django + Vite are running. "
            f"Page message: {error_text or '(none)'}. URL: {driver.current_url}"
        ) from exc
    return driver.current_url


def open_and_check(driver: webdriver.Chrome, url: str, must_contain: str, timeout: int = 15) -> None:
    driver.get(url)
    try:
        WebDriverWait(driver, timeout).until(EC.url_contains(must_contain))
    except TimeoutException as exc:
        raise AssertionError(
            f"Expected URL to contain '{must_contain}', got {driver.current_url}"
        ) from exc
    print(f"PASS: opened {driver.current_url}")
