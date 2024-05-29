import { Octokit } from 'octokit';

export interface GitHubStats {
    username: string;
    repos: number;
    contributedRepos: number;
    commits: number;
    stars: number;
    followers: number;
    linesOfCode: number;
    linesOfCodeAdded: number;
    linesOfCodeRemoved: number;
}

export class GitHubStatsFetcher {
    private userName: string;
    private octokit: Octokit;

    constructor(userName: string, accessToken: string) {
        this.userName = userName;
        this.octokit = new Octokit({
            auth: accessToken
        });
    }

    public async fetchStats(): Promise<GitHubStats> {
        const [
            repoInfo,
            contributedReposInfo,
            commitCount,
            starCount,
            followerCount,
            locInfo
        ] = await Promise.all([
            this.fetchRepoCount('OWNER'),
            this.fetchContributedRepoCount(),
            this.fetchCommitCount(),
            this.fetchStarCount(),
            this.fetchFollowerCount(),
            this.fetchLOC()
        ]);

        return {
            username: this.userName,
            repos: repoInfo,
            contributedRepos: contributedReposInfo,
            commits: commitCount,
            stars: starCount,
            followers: followerCount,
            linesOfCode: locInfo.added - locInfo.removed,
            linesOfCodeAdded: locInfo.added,
            linesOfCodeRemoved: locInfo.removed
        };
    }

    private async fetchRepoCount(...ownerAffiliations: string[]): Promise<number> {
        let totalCount = 0;
        let hasNextPage = true;
        let endCursor = null;

        while (hasNextPage) {
            const query = `
                query($login: String!, $ownerAffiliations: [RepositoryAffiliation], $first: Int, $after: String) {
                    user(login: $login) {
                        repositories(ownerAffiliations: $ownerAffiliations, privacy: PUBLIC, first: $first, after: $after) {
                            totalCount
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                            nodes {
                                name
                            }
                        }
                    }
                }
            `;
            const variables = { login: this.userName, ownerAffiliations, first: 100, after: endCursor };
            const response = await this.makeRequest(query, variables);
            totalCount += response.user.repositories.totalCount;
            hasNextPage = response.user.repositories.pageInfo.hasNextPage;
            endCursor = response.user.repositories.pageInfo.endCursor;
        }

        return totalCount;
    }

    private async fetchContributedRepoCount(): Promise<number> {
        let totalCount = 0;
        let hasNextPage = true;
        let endCursor = null;

        while (hasNextPage) {
            const query = `
                query($login: String!, $first: Int, $after: String) {
                    user(login: $login) {
                        contributionsCollection {
                            repositoryContributions(first: $first, after: $after) {
                                totalCount
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                                nodes {
                                    repository {
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
            `;
            const variables = { login: this.userName, first: 100, after: endCursor };
            const response = await this.makeRequest(query, variables);
            totalCount += response.user.contributionsCollection.repositoryContributions.totalCount;
            hasNextPage = response.user.contributionsCollection.repositoryContributions.pageInfo.hasNextPage;
            endCursor = response.user.contributionsCollection.repositoryContributions.pageInfo.endCursor;
        }

        return totalCount;
    }

    private async fetchCommitCount(): Promise<number> {
        const query = `
            query($login: String!) {
                user(login: $login) {
                    contributionsCollection {
                        contributionCalendar {
                            totalContributions
                        }
                    }
                }
            }
        `;
        const variables = { login: this.userName };
        const response = await this.makeRequest(query, variables);
        return response.user.contributionsCollection.contributionCalendar.totalContributions;
    }

    private async fetchStarCount(): Promise<number> {
        let starCount = 0;
        let hasNextPage = true;
        let endCursor = null;

        while (hasNextPage) {
            const query = `
                query($login: String!, $first: Int, $after: String) {
                    user(login: $login) {
                        repositories(first: $first, privacy: PUBLIC, after: $after) {
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                            nodes {
                                stargazers {
                                    totalCount
                                }
                            }
                        }
                    }
                }
            `;
            const variables = { login: this.userName, first: 100, after: endCursor };
            const response = await this.makeRequest(query, variables);
            const repos = response.user.repositories.nodes;
            starCount += repos.reduce((acc: number, repo: any) => acc + repo.stargazers.totalCount, 0);
            hasNextPage = response.user.repositories.pageInfo.hasNextPage;
            endCursor = response.user.repositories.pageInfo.endCursor;
        }

        return starCount;
    }

    private async fetchFollowerCount(): Promise<number> {
        let totalCount = 0;
        let hasNextPage = true;
        let endCursor = null;

        while (hasNextPage) {
            const query = `
                query($login: String!, $first: Int, $after: String) {
                    user(login: $login) {
                        followers(first: $first, after: $after) {
                            totalCount
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                            nodes {
                                login
                            }
                        }
                    }
                }
            `;
            const variables = { login: this.userName, first: 100, after: endCursor };
            const response = await this.makeRequest(query, variables);
            totalCount += response.user.followers.totalCount;
            hasNextPage = response.user.followers.pageInfo.hasNextPage;
            endCursor = response.user.followers.pageInfo.endCursor;
        }

        return totalCount;
    }

    private async fetchLOC(): Promise<{ added: number, removed: number }> {
        let added = 0, removed = 0;
        let hasNextPage = true;
        let endCursor = null;

        while (hasNextPage) {
            const query = `
                query($login: String!, $first: Int, $after: String) {
                    user(login: $login) {
                        repositories(first: $first, privacy: PUBLIC, after: $after) {
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                            nodes {
                                defaultBranchRef {
                                    target {
                                        ... on Commit {
                                            history(first: 100) {
                                                edges {
                                                    node {
                                                        additions
                                                        deletions
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `;
            const variables = { login: this.userName, first: 100, after: endCursor };
            const response = await this.makeRequest(query, variables);
            const repos = response.user.repositories.nodes;

            for (const repo of repos) {
                if (repo.defaultBranchRef && repo.defaultBranchRef.target) {
                    for (const commit of repo.defaultBranchRef.target.history.edges) {
                        added += commit.node.additions;
                        removed += commit.node.deletions;
                    }
                }
            }

            hasNextPage = response.user.repositories.pageInfo.hasNextPage;
            endCursor = response.user.repositories.pageInfo.endCursor;
        }

        return { added, removed };
    }

    private async makeRequest(query: string, variables: any): Promise<any> {
        const response: any = await this.octokit.graphql(query, variables);
        return response;
    }
}