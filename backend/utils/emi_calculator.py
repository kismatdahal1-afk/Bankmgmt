from decimal import Decimal

def calculate_emi_and_payable(principal, annual_rate, duration_months):
    p = Decimal(str(principal))
    r = Decimal(str(annual_rate))
    n = duration_months

    if r == 0:
        emi = p / n
        total_payable = p
        return round(emi, 2), round(total_payable, 2)

    mr = (r / Decimal('12')) / Decimal('100')
    one_plus_r_n = (Decimal('1') + mr) ** n
    emi = p * mr * one_plus_r_n / (one_plus_r_n - Decimal('1'))
    total_payable = emi * n
    return round(emi, 2), round(total_payable, 2)
