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
                startDate
                principal
                originalPrincipal
                collateral
                created
                createdBlock
                updated
                updatedBlock
                paid
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

export const GET_LENDINGPOOL_QUERY = gql`
    query GetLendingPool($lendingPool: ID!) {
        lendingPool(id: $lendingPool) {
            id
            timestamp
            totalPrincipal
            totalEthYield
            totalUsdcInterest
            tokenSupply  
        }
    }
`;

export const GET_USER_LOGS_QUERY = gql`
    query GetUserLogs($user: ID!) {
        userLogs(
            where: { user: $user }
            orderBy: timestamp
            orderDirection: desc
        ) {
            id
            timestamp
            block
            type
            principal
            interest
            ethYield
            collateral
            tokenAmount
            deposit{
                id
                lendingPool{ timestamp }
            }
            borrow{
                id
                timestamp
            }
            beneficiary {
                id
            }
        }
    }`;

export const GLOBAL_DATA_QUERY = gql`
    query GetGlobalData {
        globalData(id:1){
            id
            lastSnapshotDate
        }
    }
`;
