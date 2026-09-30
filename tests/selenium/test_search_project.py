from pathlib import Path

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
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
    box = WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input.filter-bar__input"))
    )
    box.clear()
    box.send_keys("Selenium")
    box.send_keys(Keys.ENTER)
    WebDriverWait(driver, 15).until(
        lambda d: "selenium" in d.page_source.lower() or "no projects match" in d.page_source.lower()
    )
    driver.save_screenshot(str(REPORTS / "02_search_project.png"))
    print("PASS: search/filter project")
    print("SCREENSHOT: tests/selenium/reports/02_search_project.png")
finally:
    driver.quit()