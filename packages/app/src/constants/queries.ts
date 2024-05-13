import { gql } from "@apollo/client";

export const META_QUERY = gql`
    {
        _meta {
            hasIndexingErrors
            block {
                hash
                number
            }
        }
    }
`;

export const USER_POSITIONS_QUERY = gql`
    query GetUserPositions($user: ID!) {
        user(id: $user) {
            id
            deposits(where:{amount_gt:0}){
                lendingPool{
                    id
                    timestamp
                    totalPrincipal
                    totalUsdcInterest
                    totalEthYield
                    totalUsdcInterest
                    tokenSupply
                    finalized
                }
                amount
                depositsUsdc
                withdrawsUsdc
            }
            borrows(where:{active:true}){
                id
                timestamp
                principal
                originalPrincipal
                collateral
                created
                createdBlock
                updated
                updatedBlock
                paid
                ltv
                apy
            }
        }
    }
`;

export const ACTIVE_LENDINGPOOLS_QUERY = gql`
    query GetActiveLendingPools {
        lendingPools(where:{finalized:false}){
            id
            timestamp
            totalPrincipal
            totalEthYield
            totalUsdcInterest
            tokenSupply
        }
    }
`;

