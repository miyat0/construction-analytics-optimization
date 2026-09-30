from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

BASE_URL = "http://localhost:5173"


def build_driver():
    options = Options()
    options.add_argument("--window-size=1280,800")
    return webdriver.Chrome(options=options)


def sign_in(driver, email, password):
    WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.ID, "email")))
    driver.find_element(By.ID, "email").clear()
    driver.find_element(By.ID, "email").send_keys(email)
    driver.find_element(By.ID, "password").clear()
    driver.find_element(By.ID, "password").send_keys(password)
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()


def must_leave_login(driver):
    try:
        WebDriverWait(driver, 20).until(lambda d: "/login" not in d.current_url)
    except TimeoutException:
        raise AssertionError("Still on login. Wrong password, or the website is not running.")
