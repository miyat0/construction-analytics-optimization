import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0003_task_daily_target_and_concern_resolve"),
        ("attendance", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendancerecord",
            name="task_assignment",
            field=models.ForeignKey(
                blank=True,
                db_column="task_assignment_id",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="attendance_records",
                to="projects.taskworkerassignment",
            ),
        ),
    ]
