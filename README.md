# Truth Engine

A fact-checking platform dedicated to the truth, the whole truth, and nothing but the truth.

## Overview

Truth Engine is a web application that allows users to verify the factual accuracy of content. It uses AI to analyze claims, search for relevant information through a custom web scraper, and verify facts against authoritative sources. The application provides detailed verification results, including the specific claims identified, verification status, and source attribution.

## Features

- **Content Verification**: Submit any text content (statements, social media posts, etc.) for fact-checking
- **Claim Extraction**: AI identifies specific factual claims within submitted content
- **Custom Web Scraper**: Searches for relevant information from multiple sources
- **Source Authority Ranking**: Prioritizes authoritative sources for verification
- **Detailed Results**: Comprehensive breakdown of verification process and findings
- **Content Rewriting**: Suggests corrections for inaccurate information

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Local Ollama instance for AI processing (or access to a remote Ollama instance)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/truth-engine.git
   cd truth-engine
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   NODE_ENV=development
   OLLAMA_URL=http://localhost:11434
   ```

4. Install and run Ollama locally (if not using a remote instance):
   Follow the instructions at [Ollama's official website](https://ollama.ai/download) to install and run Ollama on your machine.

5. Pull a supported language model:
   ```
   ollama pull llama3
   ```

### Running the Application

Start the application in development mode:
```
npm run dev
```

Or in production mode:
```
npm start
```

Visit `http://localhost:3000` in your browser to use the application.

## Usage

1. Enter or paste content you want to fact-check into the text area
2. Click "Verify Facts" to start the verification process
3. Review the results, including:
   - Claims identified in the content
   - Verification status for each claim (Confirms, Refutes, Uncertain, etc.)
   - Sources of verification
   - Suggested corrections

## Project Structure

```
truth-engine/
├── public/             # Static frontend files
│   ├── index.html      # Main HTML file
│   ├── styles.css      # CSS styles
│   └── app.js          # Frontend JavaScript
├── server.js           # Main server file
├── package.json        # Project dependencies
├── .env                # Environment configuration
└── README.md           # Project documentation
```

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **AI Processing**: Ollama
- **Web Scraping**: Custom built scraper
- **Authentication**: Not implemented in the initial version

## Future Enhancements

- Advanced web scraper with improved source ranking
- User accounts and history tracking
- Community-driven verification features
- Browser extension for inline fact-checking
- Mobile application with local LLM capabilities
- Misinformation trend analysis dashboard

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.