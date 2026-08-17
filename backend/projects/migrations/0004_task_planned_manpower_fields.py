from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0003_task_daily_target_and_concern_resolve"),
    ]

    operations = [
        migrations.AddField(
            model_name="milestonetask",
            name="planned_duration_days",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Planned working days for manpower planning.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="milestonetask",
            name="planned_hours_per_day",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Planned hours per worker per day.",
                max_digits=5,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0.01")),
                    django.core.validators.MaxValueValidator(Decimal("24.00")),
                ],
            ),
        ),
    ]
