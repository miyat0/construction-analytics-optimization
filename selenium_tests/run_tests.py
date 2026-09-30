"""
FORTESITE Selenium tests.

Keep Django and Vite running, then run ONE command at a time from the project root.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from helpers import (
    DEFAULT_BASE_URL,
    assert_left_login_page,
    build_driver,
    open_and_check,
    sign_in,
)


def suite_admin(driver, base_url: str, email: str, password: str) -> None:
    driver.get(f"{base_url}/login")
    sign_in(driver, email, password)
    assert_left_login_page(driver)
    print(f"PASS: admin signed in as {email}")
    open_and_check(driver, f"{base_url}/admin/projects", "/admin/projects")
    open_and_check(driver, f"{base_url}/admin/dashboard", "/admin/dashboard")
    open_and_check(driver, f"{base_url}/admin/profit-loss", "/admin/profit-loss")
    open_and_check(
        driver,
        f"{base_url}/admin/people/project-managers",
        "/admin/people/project-managers",
    )


def suite_pm(driver, base_url: str, email: str, password: str) -> None:
    driver.get(f"{base_url}/login")
    sign_in(driver, email, password)
    assert_left_login_page(driver)
    print(f"PASS: project manager signed in as {email}")
    open_and_check(driver, f"{base_url}/project-manager/projects", "/project-manager/projects")
    open_and_check(driver, f"{base_url}/project-manager/profit-loss", "/project-manager/profit-loss")


def suite_supervisor(driver, base_url: str, email: str, password: str) -> None:
    driver.get(f"{base_url}/login")
    sign_in(driver, email, password)
    assert_left_login_page(driver)
    print(f"PASS: supervisor signed in as {email}")
    open_and_check(driver, f"{base_url}/supervisor/dashboard", "/supervisor/dashboard")
    open_and_check(driver, f"{base_url}/supervisor/projects", "/supervisor/projects")
    open_and_check(driver, f"{base_url}/supervisor/verifications", "/supervisor/verifications")


def suite_site_engineer(driver, base_url: str, email: str, password: str) -> None:
    driver.get(f"{base_url}/login")
    sign_in(driver, email, password)
    assert_left_login_page(driver)
    print(f"PASS: site engineer signed in as {email}")
    open_and_check(driver, f"{base_url}/site-engineer/dashboard", "/site-engineer/dashboard")
    open_and_check(driver, f"{base_url}/site-engineer/projects", "/site-engineer/projects")
    open_and_check(driver, f"{base_url}/site-engineer/tasks", "/site-engineer/tasks")


def suite_worker(driver, base_url: str, email: str, password: str) -> None:
    driver.get(f"{base_url}/login")
    sign_in(driver, email, password)
    assert_left_login_page(driver)
    print(f"PASS: worker signed in as {email}")
    open_and_check(driver, f"{base_url}/worker/dashboard", "/worker/dashboard")
    open_and_check(driver, f"{base_url}/worker/tasks", "/worker/tasks")
    open_and_check(driver, f"{base_url}/worker/attendance", "/worker/attendance")
    open_and_check(driver, f"{base_url}/worker/workplace-needs", "/worker/workplace-needs")


def suite_client(driver, base_url: str, email: str, password: str) -> None:
    driver.get(f"{base_url}/login")
    sign_in(driver, email, password)
    assert_left_login_page(driver)
    print(f"PASS: client signed in as {email}")
    open_and_check(driver, f"{base_url}/client/dashboard", "/client/dashboard")


def suite_blocked(driver, base_url: str, email: str, password: str) -> None:
    driver.get(f"{base_url}/login")
    sign_in(driver, email, password)
    assert_left_login_page(driver)
    driver.get(f"{base_url}/admin/people/workers")
    WebDriverWait(driver, 15).until(
        lambda d: "/access-denied" in d.current_url
        or "/login" in d.current_url
        or "/admin/" not in d.current_url
    )
    if "/admin/people" in driver.current_url:
        raise AssertionError(f"Non-admin should not stay on admin users. URL: {driver.current_url}")
    print(f"PASS: admin users blocked, now at {driver.current_url}")


def suite_wrong_password(driver, base_url: str, email: str, password: str) -> None:
    driver.get(f"{base_url}/login")
    sign_in(driver, email, "this-password-is-wrong")
    WebDriverWait(driver, 10).until(lambda d: "/login" in d.current_url)
    if "/login" not in driver.current_url:
        raise AssertionError("Wrong password should stay on /login")
    print("PASS: wrong password stayed on login")


def suite_logout(driver, base_url: str, email: str, password: str) -> None:
    driver.get(f"{base_url}/login")
    sign_in(driver, email, password)
    assert_left_login_page(driver)
    logout = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Logout') or contains(., 'Sign Out')]"))
    )
    logout.click()
    WebDriverWait(driver, 15).until(EC.url_contains("/login"))
    print("PASS: logged out and returned to login")


SUITES = {
    "admin": suite_admin,
    "pm": suite_pm,
    "supervisor": suite_supervisor,
    "site-engineer": suite_site_engineer,
    "worker": suite_worker,
    "client": suite_client,
    "blocked": suite_blocked,
    "wrong-password": suite_wrong_password,
    "logout": suite_logout,
}


def main() -> int:
    parser = argparse.ArgumentParser(description="FORTESITE Selenium page tests")
    parser.add_argument("--suite", required=True, choices=sorted(SUITES))
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--headless", action="store_true")
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")
    driver = build_driver(headless=args.headless)
    try:
        print(f"Running suite: {args.suite}")
        SUITES[args.suite](driver, base_url, args.email, args.password)
        print("PASS: suite finished")
    except Exception as exc:
        print(f"FAIL: {exc}")
        return 1
    finally:
        driver.quit()
        print("Chrome closed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
