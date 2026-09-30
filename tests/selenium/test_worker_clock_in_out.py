from pathlib import Path

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

from helpers import BASE_URL, build_driver, must_leave_login, sign_in

REPORTS = Path(__file__).resolve().parent / "reports"
REPORTS.mkdir(exist_ok=True)

driver = build_driver()
wait = WebDriverWait(driver, 15)
try:
    driver.get(BASE_URL + "/login")
    sign_in(driver, "sonu@gmail.com", "S_o12345678")
    must_leave_login(driver)
    driver.get(BASE_URL + "/worker/dashboard")

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".worker-page__clock-btn--in"))).click()

    if driver.find_elements(By.ID, "worker-clock-in-title"):
        select = Select(driver.find_element(By.CSS_SELECTOR, ".worker-page__dialog select"))
        if select.options:
            select.select_by_index(0)
        wait.until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, ".worker-page__dialog .worker-page__dialog-btn--primary")
            )
        ).click()

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".worker-page__clock-btn--out")))
    driver.save_screenshot(str(REPORTS / "09a_clock_in.png"))

    driver.find_element(By.CSS_SELECTOR, ".worker-page__clock-btn--out").click()
    wait.until(
        EC.element_to_be_clickable(
            (By.CSS_SELECTOR, ".worker-page__dialog .worker-page__dialog-btn--primary")
        )
    ).click()

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".worker-page__clock-btn--in")))
    driver.save_screenshot(str(REPORTS / "09b_clock_out.png"))
    print("PASS: clock in then clock out")
    print("SCREENSHOT: tests/selenium/reports/09a_clock_in.png")
    print("SCREENSHOT: tests/selenium/reports/09b_clock_out.png")
finally:
    driver.quit()
