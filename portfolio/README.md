# Oreok's Thumbnail Portfolio

Live at **https://tkasafamily-spec.github.io/ai-coding-with-copa/portfolio/**

Everything for the portfolio lives in this `portfolio` folder. Nothing outside it is used.

## Add a new thumbnail (from your phone or computer)

1. Open `portfolio/thumbnails` here on GitHub → **Add file → Upload files** → pick your image → **Commit changes**.
2. Open `portfolio/thumbnails.js` → tap the ✏️ pencil → copy one of the lines and change it, like this:

   ```js
   { title: "My new video", image: "thumbnails/my-new-video.png" },
   ```

   The `image` must match the file name you uploaded exactly (capital letters count). The title is not shown on the site.
   The **first** line in the list is the one shown big at the top of the page.
3. **Commit changes**. The site updates by itself in about a minute.

## Add your Discord later

In `portfolio/index.html`, find the line that says `Discord coming soon` and follow the note right above it.

## Feedback

People fill in the form in the **Feedback** section and it gets emailed to oreoktkasa@gmail.com.

**The very first time** someone sends feedback, you'll get an email from FormSubmit asking you to confirm. Click **Activate Form** in it. After that, feedback arrives in your inbox like normal.

Nothing shows on the site until you add it, so nobody can post spam or mean stuff. To show a review:

1. Open `portfolio/feedback.js` → tap the ✏️ pencil.
2. Copy the example line, remove the `//` at the start, and fill it in:

   ```js
   { name: "CoolGamer", stars: 5, text: "Got way more clicks!", thumbnail: "Pool day" },
   ```
3. **Commit changes.** It shows on the site in about a minute.
