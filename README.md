# Mock.Shop App

A shopify admin app to allow theme and app developers easily create mock products using Mock.Shop API.

## To-do

I'm making this up as I go, whatever seems interesting to do.

### Mock.Shop Dashboard

- [x] Basic graphql queries
- [x] Index table on app home page
- [x] Thumbnails
- [x] Row selection
- [x] Index table pagination
- [x] Actually importing products lol
- [x] Map the deprecated 'featuredImage' field to 'featuredMedia'
- [x] Import status badges
- [ ] Implement skeletons for loading states
- [ ] Mock product import status with tokens
- [ ] Ability to query and import whole collections
- [ ] Banner with info about mock.shop API

#### Fix missing information from product import

- [ ] Sales channel (can't be done inside productCreate mutation)
- [ ] Prices (can't be done inside productCreate mutation)
- [ ] Variants
- [x] Category
- [ ] Collections
- [x] Full-res images (or at least one image)
- [ ] ???

#### Not that important

- [1/2] Index table row actions (view) ?? is this rly needed
- [ ] Index table sorting
- [ ] Index table filtering
