Product Information Management (PIM)
Architecture Implementation Guideline
Our system uses the PIM (Product Information Management) architecture to manage product data, multiple price points (Price Matrix), and dynamic product attributes.
Below is a detailed guideline covering the complete system architecture, database schema relations, backend logic, and frontend flow.
1. Core Objectives of PIM Architecture
In a typical e-commerce system, all product data (such as size, color, image, price) is stored in a single Product or ProductVariant table. However, in larger systems this creates complexity.
The objectives of our PIM architecture are:
•	Attribute Decoupling: Making product characteristics (such as Size, Color, Fabric, Sleeve) dynamic instead of hardcoding them.
•	Price Matrix Decoupling: Separating pricing information from product variants to support multiple pricing models (cost price, retail price, B2B price, tier price).
•	Media & Variant Linking: Binding specific product images to specific colors or attributes.
2. Database Schema and Relation Design
At the database level, the core relation works on top of 5 main tables:
a. AttributeRegistry (Attribute Dictionary)
This is a global library where all possible attributes of the system are registered.
•	code (Unique Key): The unique identifier of an attribute (e.g., jersey-size, fabric-type).
•	name: A human-readable name (e.g., "Jersey Size", "Fabric Quality").
•	type: Determines the input type (e.g., TEXT, NUMBER, DROPDOWN).
•	presets (JSON): For storing pre-defined options (e.g., for color: ["Black", "White", "Navy"] or for size: ["M", "L", "XL"]).
b. CategoryAttributeMapping (Category-Attribute Rules)
Not all products need all attributes (e.g., 'Fabric' is needed for jerseys but not for electronics). This table links attributes to categories.
•	It acts as a connector between Category and AttributeRegistry.
•	isRequired (Boolean): Whether providing this attribute is mandatory when creating a product.
•	sortOrder (Int): The display order of this attribute in the frontend form.
•	Constraint: To keep the frontend user experience simple, we will maintain a rule of mapping a maximum of 1 or 2 attributes per category (e.g., Size and Color).
c. ProductVariant (Product Variant)
A single parent product can have multiple variants (e.g., Mystic Classic Jersey - XL - Blue).
•	attributes (JSON): The specific values of a variant are stored here as an object. For example: {"fabric-type": "Polyester", "jersey-size": "XL"}.
•	It is directly related to the Product table.
d. VariantPricingMatrix (Price Matrix)
Pricing has been separated from the variant table and stored in this table. It is connected to ProductVariant in a 1-to-1 relation.
•	variantId (Unique): Identifies which variant's price this is.
•	costPrice (Decimal): The average purchase cost of the variant (calculated per WAC).
•	basePrice (Decimal): Customer-facing retail/selling price.
•	msrp (Decimal): Manufacturer Suggested Retail Price or listed price.
•	b2bPrice (Decimal): Wholesale or bulk selling price.
•	tierPrices (JSON): Discounts available when buying in larger quantities (e.g., buying 5 pcs = 400 BDT each, buying 10 pcs = 350 BDT each).
e. MediaAsset (Media Files and Attribute Linking)
This table is used to store multiple images of a product in the database.
•	productId: Indicates which product's image this is.
•	url: The file path or link of the image.
•	boundAttributes (JSON): Determines the binding of specific attributes with this image (e.g., {"color": "Red"}). As a result, when a customer selects the red color on the frontend, the website will automatically show only the red images.
3. Backend Logic & Business Flow
3 critically important tasks must be completed in the backend of the system:
a. Product CRUD & Price Initialization
•	On Create: When the user creates a new product, entries are made in the database's ProductVariant according to the form's variants. At the same time, the backend will automatically create a VariantPricingMatrix entry for each variant. The basePrice will be set to the variant's own price or the parent product's price, and costPrice will initially be null.
•	On Update: If the user deletes a variant, the related VariantPricingMatrix and Stock entries will also cascade delete to maintain database integrity. When a new variant is added, a new price matrix row will be created.
b. Weighted Average Cost (WAC) Calculation
This is the most important mathematical logic of this architecture. Whenever the admin processes a purchase entry or Purchase Ingest from a supplier, the system needs to update the new cost price or costPrice. However, directly replacing with a new price will not reconcile the cost of existing stock. So we use the WAC formula:
New Cost Price = [ (Current Stock Qty × Current Cost Price) + (New Purchase Qty × New Purchase Unit Price) ]
                                             ÷  [ Current Stock Qty + New Purchase Qty ]
Steps:
1.	When processing the purchase item, find out how many items are currently in stock (Current Stock Qty) and what the current average cost price is (Current Cost Price) for that variant.
2.	If there is no prior stock (Current Stock Qty === 0), then the new cost price will directly be the purchase unit price.
3.	If there is stock, apply the formula above to determine the new average cost price.
4.	Update the variant's costPrice field in the VariantPricingMatrix table with this new value.
5.	When the price matrix is created for the first time, initialize the selling price or basePrice by adding a 50% margin (or system-defined margin) to the purchase price (e.g., Purchase Price * 1.5).
c. Dynamic Attribute Mapper
•	A query function will exist in the backend that takes a specific categoryId as input and returns all the AttributeRegistry rules mapped to that category along with their presets values.
4. Frontend Implementation & UX
To make the user experience in the admin panel smooth, the following tasks need to be done on the frontend:
a. Attribute and Category Mapping Screen
•	There will be a screen where the admin can manage all attribute dictionaries (Create, Read, Update, Delete).
•	There will be another small interface where a category can be selected and global attributes can be linked via checkboxes (maximum 2).
b. Dynamic Product Form
•	Category-based Input: As soon as a category is selected in the form, a backend call is made and the mapped attributes for that category are loaded. For example, selecting "Jersey" will display two dropdown/option fields named "Jersey Size" and "Color" on the screen.
•	Variant Table Generation: A dynamic grid will be generated below based on the combination of selected sizes and colors.
•	Multiple Price Matrix Input:
○	There will be a checkbox in the admin panel: "Use different unit price for variants".
○	When unchecked, the price inputs in the variant table will be disabled and all variants will share the parent product's price.
○	When checked, the Price field in each variant row will be enabled separately, and the admin can save a different retail price for each variant.
•	Image Variant Tagging:
○	After uploading a product image, there will be a dropdown below each image.
○	It will show the selected attribute values (e.g., "Color: Black", "Color: White").
○	When the admin tags an image with a specific color, it is saved in the boundAttributes of the MediaAsset in the database.
5. Step-by-Step Task List for Juniors (Implementation Steps)
Tell junior developers to follow the flow below to get started:
1.	Step 1 (Schema Development): First define the AttributeRegistry, CategoryAttributeMapping, and VariantPricingMatrix tables in the database and run migrations.
2.	Step 2 (Attribute API): Create the backend functions or server actions for creating attributes and saving category mappings.
3.	Step 3 (Attribute UI): Design the screen for managing attribute creation and mapping in the admin panel.
4.	Step 4 (Product Form Update): Code the logic for fetching attribute rules when the category changes and the variant generator.
5.	Step 5 (Price & Stock Decoupling): Fix the logic for pushing and populating data to the VariantPricingMatrix table when saving a variant.
6.	Step 6 (WAC Algorithm): When taking a purchase entry, read the old stock and current cost price, implement the WAC logic, and update the price matrix.
7.	Step 7 (Media Tagging & Testing): Add the interface for tagging images with variant IDs/attributes and test whether it works correctly on the storefront.
Implementation Flow:
Step 1: Database Schema & Setup  →  Step 2: Attribute Management API  →  Step 3: Dynamic Category-Attribute Frontend UI
  →  Step 4: Product Variant Creation with Dynamic Attributes  →  Step 5: Price Matrix Integration basePrice & costPrice
  →  Step 6: Purchase Ingestion WAC Calculation Logic  →  Step 7: Media Asset Variant Tagging & Final Testing
