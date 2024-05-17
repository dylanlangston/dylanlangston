import axios from 'axios';

interface GitHubStats {
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
    private static readonly BASE_URL = 'https://api.github.com/graphql';
    private headers: { Authorization?: string } = {};
    private userName: string;

    constructor(userName: string, accessToken?: string) {
        this.userName = userName;
        if (accessToken) {
            this.headers = {
                Authorization: `Bearer ${accessToken}`,
            };
        }
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
        const query = `
            query($login: String!, $ownerAffiliations: [RepositoryAffiliation]) {
                user(login: $login) {
                    repositories(ownerAffiliations: $ownerAffiliations, privacy: PUBLIC) {
                        totalCount
                    }
                }
            }
        `;
        const variables = { login: this.userName, ownerAffiliations };
        const response = await this.makeRequest(query, variables);
        return response.data.user.repositories.totalCount;
    }

    private async fetchContributedRepoCount(): Promise<number> {
        const query = `
            query($login: String!) {
                user(login: $login) {
                    contributionsCollection {
                        repositoryContributions(first: 1) {
                            totalCount
                        }
                    }
                }
            }
        `;
        const variables = { login: this.userName };
        const response = await this.makeRequest(query, variables);
        return response.data.user.contributionsCollection.repositoryContributions.totalCount;
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
        return response.data.user.contributionsCollection.contributionCalendar.totalContributions;
    }

    private async fetchStarCount(): Promise<number> {
        const query = `
            query($login: String!) {
                user(login: $login) {
                    repositories(privacy: PUBLIC) {
                        nodes {
                            stargazers {
                                totalCount
                            }
                        }
                    }
                }
            }
        `;
        const variables = { login: this.userName };
        const response = await this.makeRequest(query, variables);
        const repos = response.data.user.repositories.nodes;
        return repos.reduce((acc: number, repo: any) => acc + repo.stargazers.totalCount, 0);
    }

    private async fetchFollowerCount(): Promise<number> {
        const query = `
            query($login: String!) {
                user(login: $login) {
                    followers {
                        totalCount
                    }
                }
            }
        `;
        const variables = { login: this.userName };
        const response = await this.makeRequest(query, variables);
        return response.data.user.followers.totalCount;
    }

    private async fetchLOC(): Promise<{ added: number, removed: number }> {
        const query = `
            query($login: String!) {
                user(login: $login) {
                    repositories(privacy: PUBLIC) {
                        nodes {
                            defaultBranchRef {
                                target {
                                    ... on Commit {
                                        history() {
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
        const variables = { login: this.userName };
        const response = await this.makeRequest(query, variables);
        const repos = response.data.user.repositories.nodes;
        let added = 0, removed = 0;

        for (const repo of repos) {
            if (repo.defaultBranchRef && repo.defaultBranchRef.target) {
                for (const commit of repo.defaultBranchRef.target.history.edges) {
                    added += commit.node.additions;
                    removed += commit.node.deletions;
                }
            }
        }

        return { added, removed };
    }

    private async makeRequest(query: any, variables: any): Promise<any> {
        const response = await axios.post(
            GitHubStatsFetcher.BASE_URL,
            { query, variables },
            { headers: this.headers }
        );
        return response.data;
    }
}