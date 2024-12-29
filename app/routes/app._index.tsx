import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, Form, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Thumbnail,
  Button,
  Text,
  DescriptionList,
  Badge,
} from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { gql, request } from "graphql-request";
import { useEffect, useState } from "react";
import { Modal, TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { title } from "process";
import handleRequest from "app/entry.server";

interface ProductsResponse {
  products: {
    edges: Array<{
      cursor: string;
      node: {
        id: string;
        title: string;
        priceRange: {
          minVariantPrice: {
            amount: string;
            currencyCode: string;
          };
        };
        handle: string;
        category: {
          name: string;
        };
        collections: {
          edges: Array<{
            node: {
              title: string;
            };
          }>;
        };
        description: string;
        featuredImage: {
          url: string;
        };
        options: Array<{
          name: string;
        }>;
        variantsCount: {
          count: number;
        };
      };
    }>;
    pageInfo: {
      hasPreviousPage: boolean;
      hasNextPage: boolean;
      endCursor: string;
      startCursor: string;
    };
  };
}

interface Product {
  id: string;
  title: string;
  description: string;
  featuredImage: {
    url: string;
  };
  variantsCount: {
    count: number;
  };
}

/*
 * Loader
 */
export const loader = async ({ request: req }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(req);
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") || null;
  const direction = url.searchParams.get("direction") || "next";

  // Fetch just the handles of existing products from Shopify
  const existingProductsQuery = await admin.graphql(
    `#graphql
      query getProductHandles {
        products(first: 250) {
          edges {
            node {
              handle
            }
          }
        }
      }
    `,
  );

  const existingProductsJson = await existingProductsQuery.json();
  const existingHandles = new Set(
    existingProductsJson.data.products.edges.map(
      (edge: any) => edge.node.handle,
    ),
  );

  const remoteProductsQuery = gql`
    query($cursor: String) {
      products(${direction === "next" ? "first" : "last"}:10, ${direction === "next" ? "after" : "before"}: $cursor) {
        edges {
          cursor
          node {
            id
            title
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            handle
            category {
              name
            }
            collections(first:5) {
              edges {
                node {
                  title
                }
              }
            }
            descriptionHtml
            featuredImage {
              url(transform: {maxHeight: 100, preferredContentType: WEBP})
            }
            options(first: 3) {
              name
            }
            variantsCount {
              count
            }
          }
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  `;

  const remoteProductsResponse = await request<ProductsResponse>(
    "https://mock.shop/api",
    remoteProductsQuery,
    { cursor },
  );

  return {
    remoteProductsResponse,
    existingHandles: Array.from(existingHandles),
  };
};

/*
 * Action
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const productData = JSON.parse(formData.get("productData") as string);

  console.log("productData: ", productData);

  const response = await admin.graphql(
    `#graphql
    mutation importMockProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
      productCreate(product: $product, media: $media) {
        product {
          id
          title
          handle
          descriptionHtml
        }
      }
    }`,
    {
      variables: {
        product: {
          title: productData.title,
          handle: productData.handle,
          descriptionHtml: productData.descriptionHtml,
        },
        media: [
          {
            mediaContentType: "IMAGE",
            originalSource: productData.featuredImage.url,
          },
        ],
      },
    },
  );

  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;

  return { product };
};

/*
 * Component
 */
export default function Index() {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const { remoteProductsResponse, existingHandles } =
    useLoaderData<typeof loader>();
  const existingHandlesSet = new Set(existingHandles);

  // Check if the fetcher is loading
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  // Get the product id from the fetcher data
  const productId = fetcher.data?.product?.id.replace(
    "gid://shopify/Product/",
    "",
  );

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId, shopify]);

  // Resource name
  const resourceName = {
    singular: "Product",
    plural: "Products",
  };

  // Format product array
  const remoteProducts = remoteProductsResponse.products.edges.map(
    ({ node }) => ({
      ...node,
      id: node.id.replace("gid://shopify/Product/", ""),
      collections: node.collections.edges.map(({ node }) => node.title),
      options: node.options.map(({ name }) => name),
    }),
  );

  // Pagination
  const paginate = (direction: "next" | "previous") => {
    const cursor =
      remoteProductsResponse.products.pageInfo[
        direction === "next" ? "endCursor" : "startCursor"
      ];
    navigate(`?direction=${direction}&cursor=${cursor}`);
  };

  // Import product
  const importProduct = (product: Product) =>
    fetcher.submit(
      { productData: JSON.stringify(product) },
      { method: "POST" },
    );

  // Row markup
  const rowMarkup = remoteProducts.map((product, index) => (
    <IndexTable.Row key={product.id} id={product.id} position={index}>
      <IndexTable.Cell>
        <Thumbnail source={product.featuredImage.url} alt={product.title} />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="bold">
          {product.title}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        ${product.priceRange.minVariantPrice.amount}{" "}
        {product.priceRange.minVariantPrice.currencyCode}
      </IndexTable.Cell>
      <IndexTable.Cell>{product.handle}</IndexTable.Cell>
      <IndexTable.Cell>{product.category.name}</IndexTable.Cell>
      <IndexTable.Cell>{product.collections.join(", ")}</IndexTable.Cell>
      <IndexTable.Cell>{product.options.join(", ")}</IndexTable.Cell>
      <IndexTable.Cell>{product.variantsCount.count}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge
          {...{
            tone: existingHandlesSet.has(product.handle) ? "success" : "info",
            children: existingHandlesSet.has(product.handle)
              ? "Imported"
              : "Available",
          }}
        />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Button
          icon={PlusIcon}
          onClick={() => importProduct(product)}
          variant="primary"
          disabled={existingHandlesSet.has(product.handle)}
        >
          Import
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <>
      <Page fullWidth title="Mock.Shop Homepage">
        <Card padding="0">
          <IndexTable
            resourceName={resourceName}
            itemCount={remoteProducts.length}
            selectable={false}
            headings={[
              { title: "Thumbnail" },
              { title: "Title" },
              { title: "Price" },
              { title: "Handle" },
              { title: "Category" },
              { title: "Collections" },
              { title: "Options" },
              { title: "Variants" },
              { title: "Status" },
              { title: "Actions" },
            ]}
            pagination={{
              hasPrevious:
                remoteProductsResponse.products.pageInfo.hasPreviousPage,
              hasNext: remoteProductsResponse.products.pageInfo.hasNextPage,
              onNext: () => paginate("next"),
              onPrevious: () => paginate("previous"),
            }}
            // loading={true}
          >
            {rowMarkup}
          </IndexTable>
        </Card>
      </Page>
    </>
  );
}
