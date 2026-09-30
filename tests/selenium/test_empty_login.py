from helpers import BASE_URL, build_driver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = build_driver()
try:
    driver.get(BASE_URL + "/login")
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "email")))
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    WebDriverWait(driver, 10).until(lambda d: "/login" in d.current_url)
    print("PASS: empty login stayed on /login")
finally:
    driver.save_screenshot("tests/selenium/reports/landing.png")
    driver.quit()