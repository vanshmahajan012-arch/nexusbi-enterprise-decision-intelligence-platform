import json

from backend.app.connectors.twelve_data_quote import TwelveDataQuote


def main() -> None:
    quote = TwelveDataQuote("AAPL")
    data = quote.get()

    print(
        json.dumps(
            data,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()