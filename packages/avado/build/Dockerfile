FROM gcr.io/hoprassociation/hoprd:master-goerli@sha256:b6feccec8d7db81de928cb982ec3bfd4f7406cf959b44b12bdc757997dcf19ff

ENTRYPOINT [ "/usr/bin/tini", "--", "yarn", "hoprd", "--password='open-sesame-iTwnsPNg0hpagP+o6T0KOwiH9RQ0'", "--init", "--admin", "--adminHost", "0.0.0.0", "--rest", "--restHost", "0.0.0.0", "--healthCheck", "--healthCheckHost", "0.0.0.0", "--data", "/app/db/data", "--identity", "/app/db/.hopr-identity", "--apiToken='!5qxc9Lp1BE7IFQ-nrtttU'" ]
