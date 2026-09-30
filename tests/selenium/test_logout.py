from helpers import BASE_URL, build_driver, must_leave_login, sign_in
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = build_driver()
try:
    driver.get(BASE_URL + "/login")
    sign_in(driver, "admin@example.com", "123")
    must_leave_login(driver)
    button = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Logout') or contains(., 'Sign Out')]"))
    )
    button.click()
    WebDriverWait(driver, 15).until(EC.url_contains("/login"))
    print("PASS: logged out")
finally:
    driver.save_screenshot("tests/selenium/reports/landing.png")
    driver.quit()