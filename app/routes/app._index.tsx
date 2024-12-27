import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Thumbnail,
  useIndexResourceState,
  Button,
  Text,
} from "@shopify/polaris";
import { ViewIcon } from "@shopify/polaris-icons";
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

  const localProductsQuery = await admin.graphql(
    `#graphql
      query {
        products(first: 10) {
          edges {
            node {
              id
            }
          }
        }
      }
    `,
  );

  const remoteProductsResponse = await request<ProductsResponse>(
    "https://mock.shop/api",
    remoteProductsQuery,
    { cursor },
  );

  const localProductsResponse = await localProductsQuery.json();

  return { remoteProductsResponse, localProductsResponse };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  return null;
};

export default function Index() {
  const { remoteProductsResponse, localProductsResponse } =
    useLoaderData<typeof loader>();
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
    }),
  );

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
  const rowMarkup = remoteProducts.map(
    (product, index) => (
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
        <IndexTable.Cell>{product.description}</IndexTable.Cell>
        <IndexTable.Cell>{product.variantsCount.count}</IndexTable.Cell>
        <IndexTable.Cell>
          <Button
            icon={ViewIcon}
            onClick={() => {
              viewProduct(product);
            }}
          >
            View
          </Button>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <>
      <Page title="Mock.Shop Product List">
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
              { title: "Description" },
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
        <Modal
          open={isModalOpen}
          onHide={() => setIsModalOpen(false)}
        > 
          <TitleBar title={selectedProduct.title} />
          <p>{selectedProduct.description}</p>
        </Modal>
      )}
    </>
  );
}
