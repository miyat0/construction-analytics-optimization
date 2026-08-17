from decimal import Decimal

from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_seed_roles"),
        ("projects", "0002_milestone_revised_end_date_projectdocument_milestone_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="milestonetask",
            name="daily_target_percentage",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Optional daily completion percentage target for this task.",
                max_digits=5,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0.00")),
                    django.core.validators.MaxValueValidator(Decimal("100.00")),
                ],
            ),
        ),
        migrations.AddField(
            model_name="dailytaskupdate",
            name="concern_resolved",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="dailytaskupdate",
            name="concern_resolved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="dailytaskupdate",
            name="concern_resolved_by",
            field=models.ForeignKey(
                blank=True,
                db_column="concern_resolved_by_user_id",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="resolved_concerns",
                to="accounts.userprofile",
            ),
        ),
    ]
