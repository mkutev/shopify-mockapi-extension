import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Thumbnail,
  useIndexResourceState,
  Button,
  ButtonGroup,
  Text,
} from "@shopify/polaris";
import { ViewIcon, PlusIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { gql, request } from "graphql-request";
import { useState } from "react";
import { Modal, TitleBar, useAppBridge } from "@shopify/app-bridge-react";

interface ProductsResponse {
  products: {
    edges: Array<{
      cursor: string;
      node: {
        id: string;
        title: string;
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

export const loader = async ({ request: req }: LoaderFunctionArgs) => {
  // await authenticate.admin(req);
  const { admin } = await authenticate.admin(req);
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") || null;
  const direction = url.searchParams.get("direction") || "next";

  const remoteProductsQuery = gql`
    query($cursor: String) {
      products(${direction === "next" ? "first" : "last"}:10, ${direction === "next" ? "after" : "before"}: $cursor) {
        edges {
          cursor
          node {
            id
            title
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
            description(truncateAt: 35)
            featuredImage {
              url(transform: {maxHeight: 100, preferredContentType: WEBP})
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

  return { remoteProductsResponse };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  return null;
};

export default function Index() {
  const { remoteProductsResponse } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle 'view' button
  const viewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

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
    }),
  );

  console.log(remoteProducts);

  // Item selection
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(remoteProducts);

  // Pagination
  const paginate = (direction: "next" | "previous") => {
    const cursor =
      remoteProductsResponse.products.pageInfo[
        direction === "next" ? "endCursor" : "startCursor"
      ];
    navigate(`?direction=${direction}&cursor=${cursor}`);
  };

  // Table rows
  const rowMarkup = remoteProducts.map((product, index) => (
    <IndexTable.Row
      key={product.id}
      id={product.id}
      position={index}
      // selected={selectedResources.includes(product.id)}
    >
      <IndexTable.Cell>
        <Thumbnail source={product.featuredImage.url} alt={product.title} />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="bold">
          {product.title}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{product.handle}</IndexTable.Cell>
      <IndexTable.Cell>{product.category.name}</IndexTable.Cell>
      <IndexTable.Cell>{product.collections.join(", ")}</IndexTable.Cell>
      {/* <IndexTable.Cell>{product.description}</IndexTable.Cell> */}
      <IndexTable.Cell>{product.variantsCount.count}</IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button
            icon={ViewIcon}
            onClick={() => {
              viewProduct(product);
            }}
          >
            View
          </Button>
          <Button icon={PlusIcon} onClick={() => {}} variant="primary">
            Import
          </Button>
        </ButtonGroup>
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
            // selectedItemsCount={
            //   allResourcesSelected ? "All" : selectedResources.length
            // }
            // onSelectionChange={handleSelectionChange}
            selectable={false}
            headings={[
              { title: "Thumbnail" },
              { title: "Title" },
              { title: "Handle" },
              { title: "Category" },
              { title: "Collections" },
              // { title: "Description" },
              { title: "Variants" },
              { title: "Actions" },
            ]}
            pagination={{
              hasPrevious:
                remoteProductsResponse.products.pageInfo.hasPreviousPage,
              hasNext: remoteProductsResponse.products.pageInfo.hasNextPage,
              onNext: () => paginate("next"),
              onPrevious: () => paginate("previous"),
            }}
          >
            {rowMarkup}
          </IndexTable>
        </Card>
      </Page>

      {selectedProduct && (
        <Modal open={isModalOpen} onHide={() => setIsModalOpen(false)}>
          <TitleBar title={selectedProduct.title} />
          <p>{selectedProduct.description}</p>
        </Modal>
      )}
    </>
  );
}
