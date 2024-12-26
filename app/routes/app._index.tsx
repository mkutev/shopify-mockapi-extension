import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Thumbnail,
  useIndexResourceState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { gql, request } from "graphql-request";

interface ProductsResponse {
  products: {
    edges: Array<{
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
  };
}

export const loader = async ({ request: req }: LoaderFunctionArgs) => {
  await authenticate.admin(req);

  const query = gql`
    {
      products(first: 10) {
        edges {
          node {
            id
            title
            description
            featuredImage {
              url
            }
            variantsCount {
              count
            }
          }
        }
      }
    }
  `;

  const queryResponse = await request<ProductsResponse>(
    "https://mock.shop/api",
    query,
  );
  return { queryResponse };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  return null;
};

export default function Index() {
  const { queryResponse } = useLoaderData<typeof loader>();
  
  const products = queryResponse.products.edges.map(({ node }) => ({
    ...node,
    id: node.id.replace("gid://shopify/Product/", ""),
    description: node.description.slice(0, 50),
  }));

  const resourceName = {
    singular: "Product",
    plural: "Products",
  };

  const {selectedResources, allResourcesSelected, handleSelectionChange} =
    useIndexResourceState(products);

  const rowMarkup = products.map(
    ({ id, title, description, variantsCount, featuredImage }, index) => (
      <IndexTable.Row key={id} id={id} position={index} selected={selectedResources.includes(id)}>
        <IndexTable.Cell>
          <Thumbnail source={featuredImage.url} alt={title} />
        </IndexTable.Cell>
        <IndexTable.Cell>{title}</IndexTable.Cell>
        <IndexTable.Cell>{description}</IndexTable.Cell>
        <IndexTable.Cell>{variantsCount.count}</IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <Page title="Mock.Shop Product List">
      <Card padding="0">
        <IndexTable
          resourceName={resourceName}
          itemCount={products.length}
          selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
          onSelectionChange={handleSelectionChange}
          headings={[
            { title: "Thumbnail" },
            { title: "Title" },
            { title: "Description" },
            { title: "Variants" },
          ]}
        >
          {rowMarkup}
        </IndexTable>
      </Card>
    </Page>
  );
}
