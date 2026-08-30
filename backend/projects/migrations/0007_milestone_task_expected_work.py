from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0006_daily_task_incomplete_reason"),
    ]

    operations = [
        migrations.AddField(
            model_name="milestonetask",
            name="expected_work",
            field=models.TextField(
                blank=True,
                help_text="Clear description of work expected from assigned workers.",
            ),
        ),
        migrations.AddField(
            model_name="milestonetask",
            name="completion_requirement",
            field=models.TextField(
                blank=True,
                help_text="What constitutes completion of this task.",
            ),
        ),
    ]
