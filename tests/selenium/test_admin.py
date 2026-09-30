from helpers import BASE_URL, build_driver, must_leave_login, sign_in
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

EMAIL = "admin@example.com"
PASSWORD = "123"

driver = build_driver()
try:
    driver.get(BASE_URL + "/login")
    sign_in(driver, EMAIL, PASSWORD)
    must_leave_login(driver)
    print("PASS: admin signed in")

    driver.get(BASE_URL + "/admin/projects")
    WebDriverWait(driver, 15).until(EC.url_contains("/admin/projects"))
    print("PASS: projects page")

    driver.get(BASE_URL + "/admin/dashboard")
    WebDriverWait(driver, 15).until(EC.url_contains("/admin/dashboard"))
    print("PASS: dashboard page")

    driver.get(BASE_URL + "/admin/profit-loss")
    WebDriverWait(driver, 15).until(EC.url_contains("/admin/profit-loss"))
    print("PASS: profit and loss page")
finally:
    driver.save_screenshot("tests/selenium/reports/landing.png")
    driver.quit()