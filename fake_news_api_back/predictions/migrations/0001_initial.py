# Generated by Django 5.1.6 on 2025-03-16 06:42

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Prediction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField()),
                ('prediction', models.CharField(choices=[('Real', 'Real'), ('Fake', 'Fake')], max_length=10)),
                ('model_used', models.CharField(max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='TrainingStats',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('model_name', models.CharField(max_length=50)),
                ('accuracy', models.FloatField()),
                ('trained_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
