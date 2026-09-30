from helpers import BASE_URL, build_driver, sign_in
from selenium.webdriver.support.ui import WebDriverWait

driver = build_driver()
try:
    driver.get(BASE_URL + "/login")
    sign_in(driver, "admin@example.com", "wrong-password")
    WebDriverWait(driver, 10).until(lambda d: "/login" in d.current_url)
    print("PASS: stayed on login")
finally:
    driver.save_screenshot("tests/selenium/reports/landing.png")
    driver.quit()