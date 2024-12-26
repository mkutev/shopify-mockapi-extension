import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  IndexTable,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { gql, request } from "graphql-request";


interface ProductsResponse {
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        description: string;
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
            variantsCount {
              count
            }
          }
        }
      }
    }
  `;

  const queryResponse = await request<ProductsResponse>("https://mock.shop/api", query);
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
    description: node.description.slice(0,50)
  }));
  const resourceName = {
    singular: 'Product',
    plural: 'Products',
  }

  console.log(products);

  const rowMarkup = products.map(
    (
      {id, title, description, variantsCount},
      index
    ) => (
      <IndexTable.Row key={id} id={id} position={index}>
        <IndexTable.Cell >{title}</IndexTable.Cell>
        <IndexTable.Cell >{description}</IndexTable.Cell>
        <IndexTable.Cell >{variantsCount.count}</IndexTable.Cell>
      </IndexTable.Row>
    )
  )

  return (
    <Page title="Mock.Shop Product List">
      <Card>
        <IndexTable
          resourceName={resourceName}
          itemCount={products.length}
          headings={[
            { title: 'Title' },
            { title: 'Description' },
            { title: 'Variants' }
          ]}
        >
          {rowMarkup}
        </IndexTable>
      </Card>
    </Page>
  );
}
