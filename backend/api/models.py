from django.db import models

class Tag(models.Model):
    tag = models.CharField(max_length=50)
    class Meta:
        verbose_name = "Tag"
        verbose_name_plural = "Tags"

    def __str__(self):
        return self.tag
    
class Plateform(models.Model):
    plateform = models.CharField(max_length=100)
    class Meta:
        verbose_name = "Plateform"
        verbose_name_plural = "Plateforms"

    def __str__(self):
        return self.plateform
class Films(models.Model):
    title = models.CharField(max_length=200)
    img = models.ImageField(upload_to='images/')
    release_year = models.IntegerField()
    director = models.CharField(max_length=100)
    main_actors = models.CharField(max_length=200)
    synopsis = models.TextField()
    tags = models.ManyToManyField('Tag', blank=True)
    plateform = models.ManyToManyField('Plateform', blank=True)

    class Meta:
        verbose_name = "Film"
        verbose_name_plural = "Films"


    def __str__(self):
        return self.title
