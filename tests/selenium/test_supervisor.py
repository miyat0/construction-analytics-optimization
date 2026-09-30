from helpers import BASE_URL, build_driver, must_leave_login, sign_in
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

EMAIL = "mki@gmail.com"
PASSWORD = "Mki_12345678"

driver = build_driver()
try:
    driver.get(BASE_URL + "/login")
    sign_in(driver, EMAIL, PASSWORD)
    must_leave_login(driver)
    driver.get(BASE_URL + "/supervisor/dashboard")
    WebDriverWait(driver, 15).until(EC.url_contains("/supervisor/dashboard"))
    print("PASS: supervisor dashboard")
finally:
    driver.save_screenshot("tests/selenium/reports/landing.png")
    driver.quit()