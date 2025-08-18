# Dropship Site Setup

This repository contains a simple one-product dropshipping storefront that you can deploy for free using GitHub Pages or Cloudflare Pages. It is designed to work with Stripe Checkout to handle payments and a Google Apps Script webhook to notify your supplier of new orders.

## Files

- `index.html` – The main page of your store. It includes a product image, description, price, and a **Buy Now** button.
- `product.png` – A placeholder image for your product. Replace this with a high‑quality photo of your product or packaging.
- `README.md` – This file. Describes how to customise and launch your store.

## Customising Your Store

1. **Product Image**: Replace `product.png` with your own product image. Keep the file name the same or update the image path in `index.html`.
2. **Product Name & Description**: Edit the `<h1>` and `<p>` tags inside `index.html` to reflect your product name and description. Use clear, concise language to describe what makes your product valuable.
3. **Price**: Update the price in the `<div class="price">` element. Set your retail price here.
4. **Stripe Checkout Link**: Replace `REPLACE_WITH_YOUR_CHECKOUT_LINK` in the `<a>` tag with the **Stripe Checkout** link you create for your product.

## Creating a Stripe Product and Checkout Link

1. Sign in to your Stripe dashboard and create a **Product** with the same name and price as your product.
2. Under the product’s **Pricing** section, add a one‑time price.
3. From the product page, click **Create Payment Link**. Choose the product price, set quantity to `1`, and create the payment link.
4. Copy the checkout link and paste it into the `href` attribute in `index.html` (replace the placeholder).

## Setting Up the Order Webhook

To notify your supplier automatically after each successful purchase, you can set up a **Google Apps Script** webhook:

1. Open [Google Apps Script](https://script.google.com/) and create a new project.
2. Copy the following script into the editor:

```javascript
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  // Extract relevant information from the Stripe event
  var session = data.data.object;
  var customerName = session.customer_details.name;
  var customerEmail = session.customer_details.email;
  var sku = session.metadata.sku;
  var supplierEmail = PropertiesService.getScriptProperties().getProperty("SUPPLIER_EMAIL");

  // Log to a Google Sheet (optional)
  var sheetId = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (sheetId) {
    var sheet = SpreadsheetApp.openById(sheetId).getSheetByName("Orders");
    sheet.appendRow([new Date(), customerName, customerEmail, sku]);
  }

  // Send order notification email to supplier
  MailApp.sendEmail({
    to: supplierEmail,
    subject: "New Order", 
    htmlBody: "<p>You have a new order!</p><p><strong>Name:</strong> " + customerName + "<br><strong>Email:</strong> " + customerEmail + "<br><strong>SKU:</strong> " + sku + "</p>"
  });

  return ContentService.createTextOutput(JSON.stringify({received: true}));
}
```

3. Go to **Project Properties → Script Properties** and set:
   - `SUPPLIER_EMAIL`: your supplier's email address (where orders should be sent).
   - `SHEET_ID`: (optional) the ID of a Google Sheet to log orders. Create a sheet with a tab named `Orders`.
4. Deploy the script as a **Web App**:
   - Select **Execute the app as** → `Me`.
   - Select **Who has access** → `Anyone`.
   - Copy the **Current web app URL**; this will be your webhook endpoint.
5. In your Stripe dashboard, go to **Developers → Webhooks → Add Endpoint**. Paste your Google Apps Script URL and subscribe to the `checkout.session.completed` event.

Now, each time a customer completes a checkout, Stripe will send a payload to your script, and your supplier will receive an email with the order details. 

## Deploying for Free

### Using GitHub Pages

1. Create a GitHub repository named something like `dropship-store`.
2. Upload the contents of this folder (`index.html`, `product.png`, `README.md`).
3. In the repository settings, enable **GitHub Pages** and choose the `main` branch as the source.
4. The site will be published at `https://<username>.github.io/<repository>/`. You can use a custom domain if you want.

### Using Cloudflare Pages

1. Sign in to Cloudflare and go to **Pages**.
2. **Create a new project** and connect it to your GitHub repository.
3. Choose the default build settings (static site). Cloudflare will deploy your site automatically.

## Summary

- Use the provided HTML template as a starting point for your product page.
- Configure Stripe for payment processing and use its checkout link.
- Set up a Google Apps Script webhook to forward orders to your supplier and log them.
- Deploy your site on a free hosting platform like GitHub Pages or Cloudflare Pages.

Once everything is in place, your dropshipping store is fully automated: customers pay via Stripe, your supplier receives order notifications, and you can monitor orders from the Google Sheet.
