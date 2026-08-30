# CSV import rules

Customer header:

```text
name,phone,email,address,vat_number,notes
```

Catalog header:

```text
category_name,category_color,item_name,item_name_ar,price,sort_order
```

- Save UTF-8 CSV and keep downloaded headers unchanged.
- Maximum 2 MB and 1,000 data rows.
- Format phone/VAT values as text to preserve leading zeroes.
- Use positive decimal prices without `SAR` or commas.
- Colors are optional six-digit `#RRGGBB` values.
- Imports are create-only; duplicate phone/email or category item rejects the
  complete file.
- Test 5–10 rows in staging and back up production before a large import.
- Never import generated IDs or invoice/token sequences.

