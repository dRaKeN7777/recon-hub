# ReconHub

ReconHub is a powerful, containerized reconnaissance and vulnerability scanning platform designed for security professionals and researchers. It provides a centralized dashboard to perform various OSINT and network scanning operations, manage results, and generate reports.

## 🚀 Features

-   **Multi-Tool Scanning Engine**:
    -   **IP Lookup**: Geolocation and ISP information.
    -   **Nmap**: Port scanning and service detection.
    -   **Whois**: Domain registration details.
    -   **Subdomain Enumeration**: Finds subdomains using `subfinder`.
    -   **DNS Lookup**: Retrieves common DNS records (A, MX, NS, TXT, etc.).
    -   **ASN Lookup**: Autonomous System Number information and prefixes.
    -   **CheckPhish**: Detects phishing and fraudulent sites.
    -   **Wappalyzer**: Identifies technologies used on websites.
    -   **Sherlock**: Searches for usernames across social media platforms.
-   **Dashboard**: Real-time statistics, recent scan history, and interactive result visualization.
-   **User Management**:
    -   Secure Authentication with JWT.
    -   Two-Factor Authentication (2FA) support.
    -   Role-Based Access Control (RBAC) with Admin and User roles.
-   **Admin Panel**: Manage users, toggle scan types, and configure system settings.
-   **Reporting**: Export scan results to CSV.
-   **Dockerized**: Fully containerized architecture for easy deployment.

## 🛠️ Tech Stack

-   **Backend**: Python, FastAPI, SQLAlchemy
-   **Frontend**: HTML5, CSS3, Vanilla JavaScript
-   **Database**: PostgreSQL
-   **Infrastructure**: Docker, Docker Compose, Nginx

## � Project Structure

```
reconhub/
├── backend/
│   ├── core/               # Core utilities (Database, Security, Models)
│   ├── routers/            # API Route Handlers (Auth, Scan, Admin)
│   ├── services/           # Business Logic
│   │   └── scanners/       # Individual Scanner Modules
│   ├── alembic/            # Database Migrations
│   └── main.py             # Application Entry Point
├── frontend/               # Static Web Assets
│   ├── css/
│   ├── js/
│   └── *.html
├── nginx/                  # Nginx Configuration
│   └── nginx.conf
├── db/                     # Database Storage
│   └── pgdata/
└── docker-compose.yml
```

## �📋 Prerequisites

-   [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/) installed on your machine.

## ⚡ Installation & Setup

1.  **Clone the repository**:
    ```bash
    cd reconhub
    ```

2.  **Configure Environment**:
    Copy the example environment file and update the values (especially secrets and API keys).
    ```bash
    cp .env.example .env
    ```
    *Edit `.env` and add your `CHECKPHISH_API_KEY` if you plan to use phishing detection.*

3.  **Build and Run**:
    Start the application using Docker Compose.
    ```bash
    docker-compose up --build -d
    ```

4.  **Access the Application**:
    Open your browser and navigate to: `http://localhost`

## 👤 User Management

### Creating an Admin User
**Note**: Admin registration via the web interface is not supported. All new accounts created via the registration page are standard "User" accounts.

To create an Admin user, you must promote a standard user via the database:

1.  Register a new account at `http://localhost/register`.
2.  Run the following command to promote the user to **Admin**:
    ```bash
    docker exec reconhub-postgres psql -U reconhub -d reconhub -c "UPDATE users SET role='admin' WHERE username='your_username';"
    ```
    *(Replace `your_username` with the actual username)*

## � API Documentation

ReconHub comes with built-in interactive API documentation powered by FastAPI (Swagger UI).

-   **Swagger UI**: `http://localhost/api/docs`
-   **ReDoc**: `http://localhost/api/redoc`

You can use these interfaces to test API endpoints directly from your browser.

## �🛡️ Security

-   **RBAC**: Endpoints are protected based on user roles.
-   **Session Management**: Handles token expiration and refresh tokens securely.
-   **Isolation**: Scans run within the containerized backend environment.

## 📝 Usage

1.  **Login** to the dashboard.
2.  **Select a Scan Type** from the dropdown menu (e.g., Nmap, Subdomain).
3.  **Enter Target** (IP, Domain, or Username depending on the scan).
4.  **View Results** directly in the dashboard or **Export** them to CSV for further analysis.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
