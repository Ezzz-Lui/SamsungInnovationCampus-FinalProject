# Generated by Django 5.1.6 on 2025-03-15 06:15

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('data_news_api', '0003_article_in_validation_set'),
        ('ml_news_classifier', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='mlmodel',
            name='algorithm',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='mlmodel',
            name='experiment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='models', to='ml_news_classifier.mlexperiment'),
        ),
    ]
