{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs = { self, nixpkgs, ... }@inputs:
  let 
    system = "aarch64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
    in
   {
    devShells.${system}.default = pkgs.mkShell {
      nativeBuildInputs = with pkgs; [
        git
      ];
    };
  };
}
