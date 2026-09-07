import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_seed_roles"),
        ("projects", "0007_milestone_task_expected_work"),
    ]

    operations = [
        migrations.AddField(
            model_name="projectassignment",
            name="assigned_by",
            field=models.ForeignKey(
                blank=True,
                db_column="assigned_by_user_id",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="created_project_assignments",
                to="accounts.userprofile",
            ),
        ),
        migrations.AddField(
            model_name="projectassignment",
            name="deactivated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RemoveConstraint(
            model_name="projectassignment",
            name="unique_active_project_assignment_role",
        ),
        migrations.AddConstraint(
            model_name="projectassignment",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    is_active=True,
                    assignment_role__in=("project_manager", "client"),
                ),
                fields=("project", "assignment_role"),
                name="unique_active_singular_project_assignment_role",
            ),
        ),
    ]
