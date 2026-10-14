This is the source code for the A Struggle With Sin Web Walkthrough.

[View the walkthrough here](https://alooftooth.github.io/ASWSWalkthrough/).

---

If you wish to add your own translation then you may do so by following these steps:

1. Clone this repository and create a new branch.
2. Duplicate the `translations/en` directory and rename the copy to the appropriate [ISO-639](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes#Table) two-character language code.
3. Add the ISO-639 code to the array `languageList` in index.php (English at the top, otherwise alphabetucally sorted please).
4. Update the values in your new `strings.json`. If you omit a key then the English version will be used instead (So probably do this for e.g. `menu.mira` where her name shouldn't change across languages).
5. Update the new `pages/*.html` files.
6. Update the new `flag.png` to a 200x100 image that is appropriately representative of the language.
7. Raise a pull request.
8. Either ping me on the A Struggle With Sin Discord, or DM me on f95zone. I will not see your PR if you do not do this.

If you submit a language you will be responsible for maintaining it when new versions release. I will not do so for you. You will need to follow the above steps 1, 4, 5, 7, and 8 any time you wish to update your translation.