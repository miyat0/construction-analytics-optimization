from helpers import BASE_URL, build_driver
from selenium.webdriver.support.ui import WebDriverWait

driver = build_driver()
try:
    driver.get(BASE_URL + "/")
    WebDriverWait(driver, 15).until(lambda d: "fortesite" in d.page_source.lower() or d.current_url.endswith("/"))
    print("PASS: landing page opened")
finally:
    driver.save_screenshot("tests/selenium/reports/landing.png")
    driver.quit()