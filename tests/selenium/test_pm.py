from helpers import BASE_URL, build_driver, must_leave_login, sign_in
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

EMAIL = "liyamarybiju@gmail.com"
PASSWORD = "Liya_12345678"

driver = build_driver()
try:
    driver.get(BASE_URL + "/login")
    sign_in(driver, EMAIL, PASSWORD)
    must_leave_login(driver)
    driver.get(BASE_URL + "/project-manager/projects")
    WebDriverWait(driver, 15).until(EC.url_contains("/project-manager/projects"))
    print("PASS: PM projects")
    driver.get(BASE_URL + "/project-manager/profit-loss")
    WebDriverWait(driver, 15).until(EC.url_contains("/project-manager/profit-loss"))
    print("PASS: PM profit and loss")
finally:
    driver.quit()