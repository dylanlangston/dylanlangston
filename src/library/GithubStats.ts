import { Octokit } from 'octokit';

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
    private userName: string;
    private octokit: Octokit;

    constructor(userName: string, accessToken?: string) {
        this.userName = userName;
        if (accessToken) {
            this.octokit = new Octokit({
                auth: accessToken
            });
        }
        else {
            this.octokit = new Octokit();
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
        return response.user.repositories.totalCount;
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
        return response.user.contributionsCollection.repositoryContributions.totalCount;
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
        const query = `
            query($login: String!) {
                user(login: $login) {
                    repositories(first: 100, privacy: PUBLIC) {
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
        const repos = response.user.repositories.nodes;
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
        return response.user.followers.totalCount;
    }

    private async fetchLOC(): Promise<{ added: number, removed: number }> {
        const query = `
            query($login: String!) {
                user(login: $login) {
                    repositories(first: 100, privacy: PUBLIC) {
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
        const variables = { login: this.userName };
        const response = await this.makeRequest(query, variables);
        const repos = response.user.repositories.nodes;
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

    private async makeRequest(query: string, variables: any): Promise<any> {
        const response: any = await this.octokit.graphql(query, variables);
        return response;
    }
}