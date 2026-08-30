# Office portal

Full-screen shop counter application for sales, token-based order lookup,
invoice printing, and daily expense entry. It is intentionally independent of
admin workflows and consumes only versioned HTTP contracts.

Before extracting this folder into its own repository, publish
`@laundry/contracts`, replace the preview-relative imports with that package,
and set the identity/order/catalog/customer/expense service URLs from `.env`.
