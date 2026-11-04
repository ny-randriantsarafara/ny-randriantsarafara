"""Print validated instance URLs for site builds and delivery smoke checks."""
import argparse
from delivery_inputs import instance_hostnames, DeliveryInputError

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("environment", choices=("prod", "preview"))
    parser.add_argument("--pull-request", default="")
    args = parser.parse_args()
    try:
        for key, hostname in instance_hostnames(args.environment, args.pull_request).items():
            print(f"{key}-url=https://{hostname}")
    except DeliveryInputError as error:
        parser.exit(1, str(error) + "\n")
