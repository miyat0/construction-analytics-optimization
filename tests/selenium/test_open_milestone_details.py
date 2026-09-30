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
    driver.get(BASE_URL + "/admin/projects")
    WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button.project-card__main"))
    ).click()
    WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Open Project')]"))
    ).click()
    WebDriverWait(driver, 15).until(EC.url_contains("/overview"))
    driver.find_element(By.LINK_TEXT, "Milestones").click()
    WebDriverWait(driver, 15).until(EC.url_contains("/milestones"))
    WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, ".milestone-manager button, article button"))
    ).click()
    driver.save_screenshot(str(REPORTS / "05_open_milestone_details.png"))
    print("PASS: open milestone details")
    print("SCREENSHOT: tests/selenium/reports/05_open_milestone_details.png")
finally:
    driver.quit()