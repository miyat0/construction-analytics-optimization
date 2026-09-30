from helpers import BASE_URL, build_driver, must_leave_login, sign_in
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

EMAIL = "client@demo.com"
PASSWORD = "Client_12345678"

driver = build_driver()
try:
    driver.get(BASE_URL + "/login")
    sign_in(driver, EMAIL, PASSWORD)
    must_leave_login(driver)
    driver.get(BASE_URL + "/client/dashboard")
    WebDriverWait(driver, 15).until(EC.url_contains("/client/dashboard"))
    print("PASS: client dashboard")
finally:
    driver.quit()