from datetime import date, timedelta

from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from helpers import BASE_URL, build_driver, must_leave_login, sign_in

PROJECT_NAME = "Selenium Create " + date.today().isoformat()

driver = build_driver()
try:
    driver.get(BASE_URL + "/login")
    sign_in(driver, "admin@example.com", "123")
    must_leave_login(driver)
    driver.get(BASE_URL + "/admin/projects")
    WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'New Project')]"))
    ).click()
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "project_name")))
    driver.find_element(By.ID, "project_name").send_keys(PROJECT_NAME)
    driver.find_element(By.ID, "description").send_keys("Created by Selenium")
    start = date.today()
    end = start + timedelta(days=30)
    driver.find_element(By.ID, "start_date").send_keys(start.isoformat())
    driver.find_element(By.ID, "end_date").send_keys(end.isoformat())
    driver.find_element(By.ID, "initial_budget").clear()
    driver.find_element(By.ID, "initial_budget").send_keys("100000")
    for field_id in ("project_manager_id", "client_id"):
        select = Select(driver.find_element(By.ID, field_id))
        for option in select.options:
            if option.get_attribute("value"):
                select.select_by_value(option.get_attribute("value"))
                break
    driver.find_element(By.XPATH, "//button[contains(., 'Create Project')]").click()
    WebDriverWait(driver, 20).until(lambda d: PROJECT_NAME.lower() in d.page_source.lower())
    print("PASS: create project")
finally:
    driver.quit()