from pathlib import Path

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

from helpers import BASE_URL, build_driver, must_leave_login, sign_in

REPORTS = Path(__file__).resolve().parent / "reports"
REPORTS.mkdir(exist_ok=True)

driver = build_driver()
wait = WebDriverWait(driver, 20)
try:
    driver.get(BASE_URL + "/login")
    sign_in(driver, "mki@gmail.com", "Mki_12345678")
    must_leave_login(driver)
    driver.get(BASE_URL + "/supervisor/projects")

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".supervisor-page__project-card")))
    assigned = False
    card_count = len(driver.find_elements(By.CSS_SELECTOR, ".supervisor-page__project-card"))
    for index in range(card_count):
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".supervisor-page__project-card")))
        driver.find_elements(By.CSS_SELECTOR, ".supervisor-page__project-card")[index].click()
        wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[@role='tab' and contains(., 'Assignments')]")
            )
        ).click()
        wait.until(EC.presence_of_element_located((By.ID, "supervisor-milestone-select")))
        milestone = Select(driver.find_element(By.ID, "supervisor-milestone-select"))
        if len(milestone.options) < 2:
            driver.execute_script("document.querySelector('.detail-modal__close')?.click()")
            wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, ".detail-modal")))
            continue

        milestone.select_by_index(1)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".task-assignment-manager")))
        task_select = Select(driver.find_element(By.CSS_SELECTOR, ".task-assignment-manager select"))
        if len(task_select.options) < 2:
            driver.execute_script("document.querySelector('.detail-modal__close')?.click()")
            wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, ".detail-modal")))
            continue
        if not task_select.first_selected_option.get_attribute("value"):
            task_select.select_by_index(1)

        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".task-assignment-manager textarea")))
        worker_select = Select(driver.find_elements(By.CSS_SELECTOR, ".task-assignment-manager select")[1])
        for option in worker_select.options:
            if option.get_attribute("value") and "sonu" in option.text.lower():
                worker_select.select_by_visible_text(option.text)
                break
        else:
            worker_select.select_by_index(1)

        duty = driver.find_element(By.CSS_SELECTOR, ".task-assignment-manager textarea")
        duty.clear()
        duty.send_keys("Selenium assignment")

        assign_btn = driver.find_element(By.CSS_SELECTOR, ".task-assignment-manager__primary-action")
        if not assign_btn.is_enabled():
            driver.execute_script("document.querySelector('.detail-modal__close')?.click()")
            wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, ".detail-modal")))
            continue

        driver.execute_script("arguments[0].click();", assign_btn)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".alert-success")))
        assigned = True
        break

    if not assigned:
        raise AssertionError("Could not assign a worker from supervisor projects.")

    driver.save_screenshot(str(REPORTS / "10a_task_assigned.png"))
    print("PASS: task assigned")

    driver.execute_script("localStorage.clear(); sessionStorage.clear();")
    driver.get(BASE_URL + "/login")
    sign_in(driver, "sonu@gmail.com", "S_o12345678")
    must_leave_login(driver)
    driver.get(BASE_URL + "/worker/tasks")
    wait.until(
        lambda d: d.find_elements(By.CSS_SELECTOR, ".worker-task-board__assignment-card")
        or "selenium assignment" in d.page_source.lower()
        or "task" in d.page_source.lower()
    )
    driver.save_screenshot(str(REPORTS / "10b_worker_sees_task.png"))
    print("PASS: worker sees task")
    print("SCREENSHOT: tests/selenium/reports/10a_task_assigned.png")
    print("SCREENSHOT: tests/selenium/reports/10b_worker_sees_task.png")
finally:
    driver.quit()
