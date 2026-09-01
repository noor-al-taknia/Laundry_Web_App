# Office portal

Full-screen shop counter application for sales, multi-field order lookup,
order detail/edit flows, invoice printing, collections, and daily expense
entry. Saved orders appear as selectable cards, while token/invoice/customer
name/customer phone search and collection rows open the same authoritative
detail view. Historical writes continue to require a task-specific Admin grant.

The customer/staff entry panel collapses after entry to maximize the service
item area. Receipt printing is isolated to the 80 mm invoice; the token uses an
outlined thermal-safe highlight, and every receipt includes its VAT TLV QR.

Before extracting this folder into its own repository, publish
`@laundry/contracts`, replace the preview-relative imports with that package,
and set the identity/order/catalog/customer/expense service URLs from `.env`.
