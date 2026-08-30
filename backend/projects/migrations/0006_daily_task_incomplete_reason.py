from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0005_workplace_need"),
    ]

    operations = [
        migrations.AddField(
            model_name="dailytaskupdate",
            name="incomplete_reason",
            field=models.CharField(
                blank=True,
                choices=[
                    ("material_unavailable", "Material unavailable"),
                    ("equipment_unavailable", "Equipment unavailable"),
                    ("safety_issue", "Safety issue"),
                    ("insufficient_manpower", "Insufficient manpower"),
                    ("weather", "Weather"),
                    ("technical_issue", "Technical issue"),
                    ("other", "Other"),
                ],
                default="",
                help_text="Required when work is incomplete (status not completed or completion below 100%).",
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name="dailytaskupdate",
            name="incomplete_reason_detail",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Free-text explanation for incomplete work.",
            ),
        ),
    ]
