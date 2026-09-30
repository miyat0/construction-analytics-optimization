from helpers import BASE_URL, build_driver, must_leave_login, sign_in
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

EMAIL = "sonu@gmail.com"
PASSWORD = "S_o12345678"

driver = build_driver()
try:
    driver.get(BASE_URL + "/login")
    sign_in(driver, EMAIL, PASSWORD)
    must_leave_login(driver)
    print("PASS: worker signed in")

    driver.get(BASE_URL + "/worker/dashboard")
    WebDriverWait(driver, 15).until(EC.url_contains("/worker/dashboard"))
    print("PASS: worker dashboard")

    driver.get(BASE_URL + "/worker/tasks")
    WebDriverWait(driver, 15).until(EC.url_contains("/worker/tasks"))
    print("PASS: worker tasks")

    driver.get(BASE_URL + "/worker/attendance")
    WebDriverWait(driver, 15).until(EC.url_contains("/worker/attendance"))
    print("PASS: worker attendance")
finally:
    driver.save_screenshot("tests/selenium/reports/landing.png")
    driver.quit()