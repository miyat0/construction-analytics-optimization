from django.db import migrations


ROLE_NAMES = (
    "Company Administrator",
    "Project Manager",
    "Site Engineer",
    "Supervisor",
    "Worker",
    "Client",
)


def seed_roles(apps, schema_editor):
    role_model = apps.get_model("accounts", "Role")

    for role_name in ROLE_NAMES:
        role_model.objects.get_or_create(
            role_name=role_name,
            defaults={"description": ""},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_roles, migrations.RunPython.noop),
    ]
