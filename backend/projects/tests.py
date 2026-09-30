from decimal import Decimal

from django.test import TestCase

from projects.finance_services import money


class MoneyHelperTests(TestCase):
    def test_money_rounds_to_two_decimals(self):
        self.assertEqual(money("10.456"), Decimal("10.46"))

    def test_money_none_is_zero(self):
        self.assertEqual(money(None), Decimal("0.00"))
