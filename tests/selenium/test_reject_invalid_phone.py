from pathlib import Path

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from helpers import BASE_URL, build_driver, must_leave_login, sign_in

REPORTS = Path(__file__).resolve().parent / "reports"
REPORTS.mkdir(exist_ok=True)

driver = build_driver()
try:
    driver.get(BASE_URL + "/login")
    sign_in(driver, "admin@example.com", "123")
    must_leave_login(driver)
    driver.get(BASE_URL + "/admin/people/workers")
    WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Add Worker')]"))
    ).click()
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "name")))
    driver.find_element(By.ID, "name").send_keys("Test Worker")
    driver.find_element(By.ID, "email").send_keys("phonefail@example.com")
    driver.find_element(By.ID, "phone_number").send_keys("123")
    driver.find_element(By.ID, "password").send_keys("Worker_12345678")
    driver.find_element(By.XPATH, "//button[contains(., 'Create Worker')]").click()
    WebDriverWait(driver, 10).until(lambda d: "10 digits" in d.page_source.lower())
    driver.save_screenshot(str(REPORTS / "06_reject_invalid_phone.png"))
    print("PASS: reject invalid phone number")
    print("SCREENSHOT: tests/selenium/reports/06_reject_invalid_phone.png")
finally:
    driver.quit()